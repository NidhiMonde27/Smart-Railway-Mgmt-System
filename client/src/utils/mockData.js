export const TRAIN_SERVICES = [
    { id: 1, name: "Fast Local", time: "10:15", route: "Churchgate - Virar", platform: 3, crowdLevel: "High", occupancy: 92, type: "Train" },
    { id: 2, name: "Slow Local", time: "10:22", route: "Churchgate - Borivali", platform: 1, crowdLevel: "Medium", occupancy: 65, type: "Train" },
    { id: 3, name: "AC Local", time: "10:45", route: "Churchgate - Virar", platform: 4, crowdLevel: "Low", occupancy: 42, type: "Train" },
    { id: 4, name: "Metro Line 3", time: "10:10", route: "Cuffe Parade - SEEPZ", platform: 2, crowdLevel: "Medium", occupancy: 58, type: "Metro" },
    { id: 5, name: "Metro Line 1", time: "10:18", route: "Versova - Ghatkopar", platform: 1, crowdLevel: "High", occupancy: 88, type: "Metro" },
];

export const getLiveCrowdData = () => {
    return TRAIN_SERVICES.map(service => {
        const change = Math.floor(Math.random() * 10) - 5;
        const newOccupancy = Math.min(100, Math.max(0, service.occupancy + change));
        let level = "Low";
        if (newOccupancy > 80) level = "High";
        else if (newOccupancy > 50) level = "Medium";

        return {
            ...service,
            occupancy: newOccupancy,
            crowdLevel: level
        };
    });
};

export const MOCK_TICKET = {
    id: "TKT-MUM-8821",
    source: "Churchgate",
    destination: "Virar",
    class: "First Class",
    passengers: 1,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString(),
    fare: 105,
    status: "Active"
};
