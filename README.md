# Arknica Sales OS (MVP)

System for high-tech lead generation and automated proposal creation.

## Setup Instructions

1.  **Environment Variables**:
    Copy `.env.local.example` to `.env.local` and fill in your keys:

    - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
    - `Maps_API_KEY`: Google Maps API Key (with Places API enabled).
    - `GEMINI_API_KEY`: Google Gemini API Key.

2.  **Database Setup**:

    - Go to your Supabase SQL Editor.
    - Copy the content of `sql/schema.sql`.
    - Run the query to create tables (`leads`, `generated_assets`) and policies.

3.  **Run Development Server**:

    ```bash
    npm run dev
    ```

4.  **Usage**:
    - Enter a City and Category (e.g., "Miami", "Dentist").
    - Click "SCAN".
    - Use "GENERATE DEMO" (Red) for offline businesses (Creates a landing page).
    - Use "PRINT PROPOSAL" (Green) for online businesses (Creates a sales pitch).

## Tech Stack

- **Framework**: Next.js 14/15 (App Router)
- **Styling**: Tailwind CSS, Lucide React
- **Database**: Supabase
- **AI**: Google Gemini Pro
- **Data**: Google Places API
