export type PluginEventPayloads = {
  'task:created': { task: { projectId: string } };
  'task:updated': { task: { projectId: string } };
  'task:deleted': { task: { projectId: string } };
  'task:status_changed': {
    projectId: string;
    taskId: string;
    taskNumber: number;
    oldStatusId: string | null;
    newStatusId: string | null;
  };
  'project:created': { project: { id: string } };
  'project:updated': { project: { id: string } };
  'label:created': { label: { projectId: string } };
  'status:created': { status: { projectId: string } };
  'plugin:activated': { plugin: { projectId: string; pluginId: string } };
  'plugin:deactivated': { plugin: { projectId: string; pluginId: string } };
};

export type PluginEventName = keyof PluginEventPayloads;
export type PluginEventPayload = PluginEventPayloads[PluginEventName];
export type PluginEventHandler<Name extends PluginEventName> = (
  payload: PluginEventPayloads[Name],
) => Promise<void> | void;

export type PluginEventHandlers = {
  [Name in PluginEventName]?: PluginEventHandler<Name>;
};

export type PluginHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type PluginHttpHandler = (request: Request) => Promise<Response> | Response;

export type PluginHttpRoute = {
  path: string;
  handlers: Partial<Record<PluginHttpMethod, PluginHttpHandler>>;
  getProjectId?: (request: Request) => string | null;
  requiresActivePlugin?: boolean;
};

export type ServerPluginContribution = {
  id: string;
  events?: PluginEventHandlers;
  http?: ReadonlyArray<PluginHttpRoute>;
};

export type PluginEventDispatcher = <Name extends PluginEventName>(
  projectId: string,
  eventName: Name,
  payload: PluginEventPayloads[Name],
) => Promise<void>;

export type PluginDispatchFailure =
  | {
      phase: 'active-plugin-lookup';
      projectId: string;
      eventName: PluginEventName;
    }
  | {
      phase: 'plugin-handler';
      projectId: string;
      eventName: PluginEventName;
      pluginId: string;
    };

export type PluginHttpDispatcher = (
  pluginId: string,
  path: string,
  method: PluginHttpMethod,
  request: Request,
) => Promise<Response>;
