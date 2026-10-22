const express = require('express');
const router = express.Router();
const supabase = require('../db');

// GET /api/trains - List all trains/transports with their routes
router.get('/trains', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transports')
            .select(`
                id,
                name,
                type,
                capacity,
                transport_status (
                    current_occupancy,
                    status,
                    route_id
                )
            `);
        
        if (error) throw error;

        // Format for frontend
        const formatted = data.map(t => ({
            id: t.id,
            name: t.name,
            type: t.type,
            capacity: t.capacity,
            // Safe access to array (relation returns array)
            current_occupancy: t.transport_status?.[0]?.current_occupancy || 0,
            status: t.transport_status?.[0]?.status || 'Low',
            route_id: t.transport_status?.[0]?.route_id,
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Error fetching trains:', err);
        res.status(500).json({ error: 'Failed to fetch trains' });
    }
});

// GET /api/crowd - Get crowd status (can filter by transport_id)
router.get('/crowd', async (req, res) => {
    try {
        const { transport_id } = req.query;
        let query = supabase
            .from('transport_status')
            .select(`
                *,
                transports (name, type, capacity)
            `);
        
        if (transport_id) {
            query = query.eq('transport_id', transport_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('Error fetching crowd status:', err);
        res.status(500).json({ error: 'Failed to fetch crowd data' });
    }
});

module.exports = router;
