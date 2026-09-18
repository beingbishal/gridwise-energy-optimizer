import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { interpretOperatorNotes } from './server/gemini.js';
import { optimizeSchedule } from './server/optimizer.js';
import { validateOptimizeRequest } from './server/validator.js';
import { OptimizeEnergyRequest } from './src/types.js';

// Safe resolution for dist directory in both dev (tsx/ESM) and prod (bundled CJS)
const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with safe error handling
  app.use(express.json({ limit: '10mb' }));

  // Handle JSON parse errors safely (Section 6.1: HTTP 400 for malformed JSON)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
      return res.status(400).json({ error: 'Malformed JSON payload in request body' });
    }
    next(err);
  });

  // CORS headers for evaluation harness flexibility
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // --- 06. API Contract Endpoints ---

  /**
   * GET /health
   * Requirement: Return HTTP 200 with JSON object {"status": "ok"} when service is ready.
   */
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  /**
   * POST /optimize-energy
   * Requirement: Accept scenario JSON, interpret operator notes via LLM with guardrails,
   * produce optimal 24h schedule, return machine-checkable plan.
   */
  app.post('/optimize-energy', async (req: Request, res: Response) => {
    try {
      const body = req.body;

      // 1. Validate request structure (HTTP 400 on malformed/invalid schema)
      const validation = validateOptimizeRequest(body);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error || 'Invalid request schema',
        });
      }

      const optimizeRequest = body as OptimizeEnergyRequest;

      // 2. LLM interpretation with deterministic guardrails (Section 04, 05, 08)
      const directives = await interpretOperatorNotes(
        optimizeRequest.operator_notes,
        optimizeRequest.battery
      );

      // 3. Mathematical Optimization (Linear Programming & Replay Verification)
      const optResult = optimizeSchedule(optimizeRequest, directives);

      if (!optResult.success || !optResult.response) {
        // Section 6.1: 422 for semantically invalid / infeasible request
        return res.status(422).json({
          error: optResult.error || 'Unable to generate feasible energy schedule with given constraints',
        });
      }

      // Return HTTP 200 with exact specification schema (Section 10)
      return res.status(200).json(optResult.response);
    } catch (error: any) {
      console.error('[Error in /optimize-energy]:', error?.message || error);
      // Section 6.1: Controlled internal error. Do not expose secrets or raw stack traces.
      return res.status(500).json({
        error: 'An internal error occurred during optimization processing',
      });
    }
  });

  // Sample data endpoint for frontend convenience
  app.get('/api/sample-scenario', (req: Request, res: Response) => {
    res.json({
      scenario_id: 'GRID-101',
      operator_notes: [
        'Solar output will drop to about 20% from 1 PM to 3 PM.',
        'Do not charge the battery between 2 PM and 4 PM.',
        'The cafeteria menu changes tomorrow.',
      ],
      hours: [
        { hour: 0, demand_kwh: 180, solar_kwh: 0, tariff_bdt_per_kwh: 7 },
        { hour: 1, demand_kwh: 170, solar_kwh: 0, tariff_bdt_per_kwh: 7 },
        { hour: 2, demand_kwh: 160, solar_kwh: 0, tariff_bdt_per_kwh: 6 },
        { hour: 3, demand_kwh: 150, solar_kwh: 0, tariff_bdt_per_kwh: 6 },
        { hour: 4, demand_kwh: 150, solar_kwh: 0, tariff_bdt_per_kwh: 6 },
        { hour: 5, demand_kwh: 160, solar_kwh: 0, tariff_bdt_per_kwh: 6 },
        { hour: 6, demand_kwh: 190, solar_kwh: 10, tariff_bdt_per_kwh: 7 },
        { hour: 7, demand_kwh: 220, solar_kwh: 40, tariff_bdt_per_kwh: 8 },
        { hour: 8, demand_kwh: 260, solar_kwh: 90, tariff_bdt_per_kwh: 9 },
        { hour: 9, demand_kwh: 300, solar_kwh: 150, tariff_bdt_per_kwh: 10 },
        { hour: 10, demand_kwh: 320, solar_kwh: 200, tariff_bdt_per_kwh: 11 },
        { hour: 11, demand_kwh: 340, solar_kwh: 240, tariff_bdt_per_kwh: 11 },
        { hour: 12, demand_kwh: 350, solar_kwh: 260, tariff_bdt_per_kwh: 11 },
        { hour: 13, demand_kwh: 340, solar_kwh: 250, tariff_bdt_per_kwh: 10 },
        { hour: 14, demand_kwh: 320, solar_kwh: 220, tariff_bdt_per_kwh: 10 },
        { hour: 15, demand_kwh: 300, solar_kwh: 170, tariff_bdt_per_kwh: 10 },
        { hour: 16, demand_kwh: 280, solar_kwh: 110, tariff_bdt_per_kwh: 9 },
        { hour: 17, demand_kwh: 270, solar_kwh: 50, tariff_bdt_per_kwh: 9 },
        { hour: 18, demand_kwh: 290, solar_kwh: 10, tariff_bdt_per_kwh: 12 },
        { hour: 19, demand_kwh: 310, solar_kwh: 0, tariff_bdt_per_kwh: 12 },
        { hour: 20, demand_kwh: 300, solar_kwh: 0, tariff_bdt_per_kwh: 11 },
        { hour: 21, demand_kwh: 260, solar_kwh: 0, tariff_bdt_per_kwh: 10 },
        { hour: 22, demand_kwh: 220, solar_kwh: 0, tariff_bdt_per_kwh: 8 },
        { hour: 23, demand_kwh: 200, solar_kwh: 0, tariff_bdt_per_kwh: 7 },
      ],
      battery: {
        capacity_kwh: 500,
        initial_energy_kwh: 200,
        minimum_energy_kwh: 50,
        max_charge_kwh_per_hour: 100,
        max_discharge_kwh_per_hour: 100,
      },
    });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Unhandled Server Error]:', err);
    res.status(500).json({ error: 'Controlled internal server error' });
  });

  // Vite middleware setup (development vs production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Campus Energy Optimizer] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Failure]:', err);
  process.exit(1);
});
