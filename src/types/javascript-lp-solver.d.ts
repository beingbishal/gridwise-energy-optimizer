declare module 'javascript-lp-solver' {
  export interface LPModel {
    optimize: string;
    opType: 'min' | 'max';
    constraints: Record<string, { min?: number; max?: number; equal?: number }>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, number>;
    binaries?: Record<string, number>;
    unrestricted?: Record<string, number>;
  }

  export interface LPSolution {
    feasible: boolean;
    result: number;
    bounded?: boolean;
    isIntegral?: boolean;
    [key: string]: any;
  }

  export function Solve(model: LPModel): LPSolution;
}
