export interface ProjectScenario {
  id: string;
  name: string;
  description: string;
}

export const DEFAULT_SCENARIO_ID = 'default';

export const DEFAULT_SCENARIO: ProjectScenario = {
  id: DEFAULT_SCENARIO_ID,
  name: 'Default',
  description: 'Default scenario',
};
