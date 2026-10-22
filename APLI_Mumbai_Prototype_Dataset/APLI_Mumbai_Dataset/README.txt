APLI-MUMBAI PROTOTYPE DATASET

Purpose
-------
This folder is a structured CSV representation of data found in the submitted APLI-MUMBAI project code.

Files
-----
1. mumbai_stations.csv
   Local Train and Metro station records extracted from client/src/utils/allStations.js.

2. transport_routes.csv
   Station sequence by Local/Metro line, generated from the same existing project station arrays.

3. peak_hours_analysis.csv
   24-hour crowd percentages currently embedded in Dashboard.jsx.

4. live_crowd_status.csv
   Dashboard crowd-status records currently embedded in Dashboard.jsx.

5. network_status.csv
   Western/Central/Harbour status percentages currently embedded in Dashboard.jsx.

6. recent_activity_sample.csv
   Sample Recent Activity records currently embedded in Dashboard.jsx.

Important implementation note
-----------------------------
The current submitted application does NOT read these CSV files at runtime.
The current prototype keeps these records embedded in the application code.
These CSVs are the dataset representation of those existing records and can be shown as the
structured prototype dataset. They should not be described as a live external API dataset.

Nearest-station calculations in the submitted code already use station coordinates and browser
geolocation through the project's station data.

Recommended viva wording
------------------------
“For our prototype, we prepared a custom structured Mumbai transport dataset. In the current build,
the required records are embedded in the application for reliable offline demonstration. These CSV
files are the structured dataset representation of the same station, route and analytical records.
The dataset can later be moved to the database/API without changing the conceptual data model.”
