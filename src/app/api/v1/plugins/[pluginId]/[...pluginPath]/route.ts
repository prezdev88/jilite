import type { PluginHttpMethod } from '@/plugin-sdk/server';
import { dispatchPluginHttpRequest } from '@/plugins/server-runtime';

type PluginRouteContext = {
  params: {
    pluginId: string;
    pluginPath: string[];
  };
};

function dispatch(method: PluginHttpMethod, request: Request, context: PluginRouteContext) {
  return dispatchPluginHttpRequest(
    context.params.pluginId,
    context.params.pluginPath.join('/'),
    method,
    request,
  );
}

export function GET(request: Request, context: PluginRouteContext) {
  return dispatch('GET', request, context);
}

export function POST(request: Request, context: PluginRouteContext) {
  return dispatch('POST', request, context);
}

export function PUT(request: Request, context: PluginRouteContext) {
  return dispatch('PUT', request, context);
}

export function PATCH(request: Request, context: PluginRouteContext) {
  return dispatch('PATCH', request, context);
}

export function DELETE(request: Request, context: PluginRouteContext) {
  return dispatch('DELETE', request, context);
}
