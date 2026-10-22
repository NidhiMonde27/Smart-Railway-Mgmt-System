const supabase = require('./db');

async function seed() {
    console.log("🌱 Seeding Database...");

    try {
        // 1. Clear existing data (optional, but good for idempotency)
        // Note: Delete logic might need RLS policies or be tricky without cascade.
        // Skipping delete for now, assuming empty or appending is fine for prototype.

        // 2. Insert Transports
        const { data: transports, error: tError } = await supabase
            .from('transports')
            .upsert([
                { id: 1, name: 'Fast Local', type: 'local', capacity: 2000 },
                { id: 2, name: 'Slow Local', type: 'local', capacity: 2000 },
                { id: 3, name: 'AC Local', type: 'ac-local', capacity: 1500 },
                { id: 4, name: 'Metro Line 3', type: 'metro', capacity: 1200 }
            ])
            .select();

        if (tError) throw tError;
        console.log(`✅ Inserted ${transports.length} transports.`);

        // 3. Insert Routes
        const { data: routes, error: rError } = await supabase
            .from('routes')
            .upsert([
                { id: 1, name: 'Churchgate - Virar', stations: ["Churchgate", "Dadar", "Andheri", "Virar"] },
                { id: 2, name: 'Churchgate - Borivali', stations: ["Churchgate", "Marine Lines", "Borivali"] },
                { id: 3, name: 'Cuffe Parade - SEEPZ', stations: ["Cuffe Parade", "BKC", "SEEPZ"] }
            ])
            .select();

        if (rError) throw rError;
        console.log(`✅ Inserted ${routes.length} routes.`);

        // 4. Insert Initial Status
        const { data: status, error: sError } = await supabase
            .from('transport_status')
            .upsert([
                { id: 1, transport_id: 1, route_id: 1, current_occupancy: 1850, status: 'High' },
                { id: 2, transport_id: 2, route_id: 2, current_occupancy: 800, status: 'Medium' },
                { id: 3, transport_id: 3, route_id: 1, current_occupancy: 200, status: 'Low' },
                { id: 4, transport_id: 4, route_id: 3, current_occupancy: 600, status: 'Medium' }
            ])
            .select();
        
        if (sError) throw sError;
        console.log(`✅ Inserted ${status.length} status records.`);
        console.log("🎉 Seeding Complete!");

    } catch (err) {
        console.error("❌ Seeding Failed:", err.message);
        console.error("   Details:", err);
    }
}

seed();
