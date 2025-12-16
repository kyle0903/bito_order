# BitoPro Trading Dashboard

A modern, professional crypto asset management and trading interface for BitoPro exchange.

## Features

- **Asset Overview**: Real-time portfolio value and asset tracking
- **Trading Interface**: Place market and limit orders
- **Order History**: View and track all your trades
- **Clean Design**: Minimal, efficiency-focused UI inspired by Linear and Stripe

## Design Philosophy

- **Tool-oriented**: Built for users with trading experience
- **Neutral color palette**: Professional appearance with low-saturation accent colors
- **Functional color usage**: Colors indicate status and price movements
- **No Web3 aesthetics**: Clean, modern design without excessive styling

## Tech Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **BitoPro API v3**: Cryptocurrency exchange integration

## Getting Started

### Prerequisites

- Node.js 18+
- BitoPro account and API credentials

### Installation

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your BitoPro API credentials:

```
BITOPRO_API_KEY=your_api_key_here
BITOPRO_API_SECRET=your_api_secret_here
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Build for production:

```bash
npm run build
npm start
```

## Project Structure

```
web/
├── app/                  # Next.js App Router pages
│   ├── api/             # API routes
│   ├── trading/         # Trading interface
│   ├── history/         # Order history
│   └── settings/        # Configuration
├── components/          # React components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Sidebar.tsx
│   └── Toast.tsx
├── lib/                 # Utilities and API client
│   └── bitopro.ts      # BitoPro API wrapper
└── styles/             # Global styles
```

## API Integration

The dashboard integrates with BitoPro API v3:

- Account balance queries
- Real-time price data
- Order placement (market/limit)
- Order history tracking
- Active order management

## Security Notes

- Never commit your `.env` file
- Keep API credentials secure
- Use API keys with appropriate permissions
- Consider IP whitelisting in BitoPro settings

## License

Private use only.
