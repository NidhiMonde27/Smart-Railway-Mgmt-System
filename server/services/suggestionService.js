const supabase = require('../db');

/**
 * Suggests an alternate transport if the current one is crowded.
 * Logic:
 * 1. Find the current route of the crowded transport.
 * 2. Look for other transports on the same route (or similar routes).
 * 3. Filter for those with 'Low' or 'Medium' crowd.
 * 4. Prioritize by time (if schedule exists) or just return the next available one.
 */
async function getAlternateSuggestion(transportId) {
    try {
        // 1. Get details of the current (crowded) transport
        const { data: currentTransport, error: tError } = await supabase
            .from('transport_status')
            .select(`
                transport_id,
                status,
                transports (id, name, type),
                routes (id, name)
            `)
            .eq('transport_id', transportId)
            .single();

        if (tError || !currentTransport) {
            console.error("Error fetching transport details:", tError);
            return null;
        }

        const currentRouteId = currentTransport.routes?.id;
        const currentType = currentTransport.transports?.type;

        if (!currentRouteId) return null;

        // 2. Find alternatives on the same route
        const { data: alternatives, error: aError } = await supabase
            .from('transport_status')
            .select(`
                transport_id,
                current_occupancy,
                status,
                transports (id, name, type, capacity)
            `)
            .eq('route_id', currentRouteId)
            .neq('transport_id', transportId) // Exclude self
            .neq('status', 'High') // Exclude other crowded trains
            .order('current_occupancy', { ascending: true }) // Least crowded first
            .limit(1);

        if (aError) {
            console.error("Error fetching alternatives:", aError);
            return null;
        }

        if (alternatives && alternatives.length > 0) {
            const alt = alternatives[0];
            return {
                message: `Suggested Alternative: ${alt.transports.name} (${alt.transports.type})`,
                reason: `Current train is crowded. Alternative has ${alt.status} crowd (${alt.current_occupancy} pax).`,
                transport_id: alt.transport_id
            };
        }

        // 3. If no same-route alternative, maybe check Cross-Type (e.g. Metro vs Local)
        // Simple logic: If Local is full, check Metro (assuming hardcoded knowledge that Metro Line 3 parallels some local routes)
        if (currentType === 'local') {
             const { data: metroAlt, error: mError } = await supabase
                .from('transport_status')
                .select(`
                    transport_id,
                    status,
                    transports (id, name, type)
                `)
                .eq('transports.type', 'metro') // This filter might fail if complex join, but trying simple
                .neq('status', 'High')
                .limit(1);
            
            // Note: Supabase JS select with inner join filter is tricky. 
            // Simplified: Just fetch all metros status and filter in JS for prototype
             const { data: metros } = await supabase
                .from('transport_status')
                .select(`*, transports!inner(type, name)`)
                .eq('transports.type', 'metro')
                .neq('status', 'High')
                .limit(1);

            if (metros && metros.length > 0) {
                const alt = metros[0];
                return {
                    message: `Switch Mode: Take ${alt.transports.name}`,
                    reason: `Local trains are crowded. Metro is ${alt.status}.`,
                    transport_id: alt.transport_id
                };
            }
        }

        return {
            message: "No better alternatives found at the moment.",
            reason: "All tracked services are busy."
        };

    } catch (err) {
        console.error("Suggestion Error:", err);
        return null;
    }
}

module.exports = { getAlternateSuggestion };
