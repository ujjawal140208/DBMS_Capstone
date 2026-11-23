# Public hospital directory data

The project intentionally does not bundle a stale copy of a large external dataset. Use `npm run import:hospitals -- --sample` to fetch one randomly selected hospital-type record, or `npm run import:hospitals` to page through the complete provider directory and upsert it into the dedicated `public_hospitals` MongoDB collection.

Source: Esri India Living Atlas — Hospital Directory of India. The provider description traces source inputs to the Government of India's National Health Portal Hospital Directory and All India Health Centres Directory. Each imported document stores its source record ID, source layer URL, source catalog URLs, and import timestamp.

The source layer also contains non-hospital facility types (for example clinics and primary health centres). These are preserved in `facility_type` so they can be filtered rather than being misrepresented as hospitals. Check source terms and attribution before redistribution.
