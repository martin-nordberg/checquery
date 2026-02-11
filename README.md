# Checquery

This project serves to capture personal finance information. It is much like a simplified Quicken or the like. 

The application is a web application. Data comes from a log of events in a YAML file, gaining some of the
advantages of plain text accounting if you edit the YAML manually. The events feed into a SQLLite in-memory
database upon server start up. Changes are saved both to SQL and YAML data sources.

The back end runs on Bun, uses Bun's native SQLLite interface together with Hono and Zod for data retrieval,
validation, and persistence.

The front end is built with SolidJS plus Hono Client and Zod for seamless type-safe interaction with the backend.
CSS is via TailwindCSS.
