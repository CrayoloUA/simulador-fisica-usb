export type Params = Record<string, number>;
export type State = Record<string, number>;

export interface ParamSpec {
  key: string;
  label: string;
  symbol: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface ModelLimitResult {
  valid: boolean;
  message: string;
}

export interface ModelLimit {
  id: string;
  evaluate(params: Params): ModelLimitResult;
}

export interface Phenomenon {
  id: string;
  name: string;
  paramSchema: ParamSpec[];
  modelLimits: ModelLimit[];
  initialState(params: Params): State;
  derivatives(state: State, params: Params): State;
  outputs(state: State, params: Params): Record<string, number>;
  theory(params: Params, t: number): Record<string, number>;
}

export interface Sample {
  t: number;
  values: Record<string, number>;
  theory: Record<string, number>;
}
