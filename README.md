# Checquery

This project serves to capture personal finance information. It is much like a simplified Quicken or the like. 

## Design and Implementation
The application is a web application. Data comes from a log of events in a YAML file, gaining some of the
advantages of plain text accounting if you edit the YAML manually. The events feed into a PGLite in-memory
database upon server start up. Changes are saved both to SQL and YAML data sources.

The back end runs on Bun with Hono and Zod for data retrieval, validation, and persistence.

The front end is built with SolidJS plus Hono Client and Zod for seamless type-safe interaction with the backend.
CSS is via TailwindCSS.

This application was built in a few hours with Claude Code guided by handwritten architecture-establishing 
preliminary code. Though the application is useful in itself, it is primarily a testbed for learning
the above frameworks and tools without a unique domain to complicate things.

## Experimentation in Progress
* Convert to a local-first edge computing approach with PGLite in the browser.
* Use Websockets to distribute events across clients for synchronized editing of transactions.
* Use a hybrid logical clock to implement "last write wins" while still maintaining balanced and 
  consistent accounting transactions.