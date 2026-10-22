const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { getAlternateSuggestion } = require('../services/suggestionService');

// POST /api/scan - Simulate a scan event (IN/OUT)
router.post('/', async (req, res) => {
    const { transport_id, event_type, user_id } = req.body; // event_type: 'IN' or 'OUT'

    if (!transport_id || !event_type) {
        return res.status(400).json({ error: 'Missing transport_id or event_type' });
    }

    try {
        // 1. Get current status and capacity
        const { data: statusData, error: sError } = await supabase
            .from('transport_status')
            .select(`
                id,
                current_occupancy,
                transports (capacity)
            `)
            .eq('transport_id', transport_id)
            .single();
        
        if (sError) throw sError;
        if (!statusData) return res.status(404).json({ error: 'Transport status not found' });

        let currentOccupancy = statusData.current_occupancy || 0;
        const capacity = statusData.transports?.capacity || 2000;

        // 2. Update Occupancy
        if (event_type === 'IN') {
            currentOccupancy += 1;
        } else if (event_type === 'OUT' && currentOccupancy > 0) {
            currentOccupancy -= 1;
        }

        // 3. Determine New Status Level
        const occupancyRate = (currentOccupancy / capacity) * 100;
        let newStatus = 'Low';
        if (occupancyRate > 70) newStatus = 'High';
        else if (occupancyRate > 30) newStatus = 'Medium';

        // 4. Save updates
        const { data: updatedData, error: uError } = await supabase
            .from('transport_status')
            .update({ 
                current_occupancy: currentOccupancy,
                status: newStatus,
                last_updated: new Date().toISOString()
            })
            .eq('id', statusData.id)
            .select()
            .single();

        if (uError) throw uError;

        // 5. Generate Suggestion if Crowd is High (entering) or just return info
        let suggestion = null;
        if (newStatus === 'High' && event_type === 'IN') {
            suggestion = await getAlternateSuggestion(transport_id);
        }

        res.json({
            success: true,
            data: updatedData,
            suggestion: suggestion
        });

    } catch (err) {
        console.error('Scan Event Error:', err);
        res.status(500).json({ error: 'Processing scan failed' });
    }
});

module.exports = router;
