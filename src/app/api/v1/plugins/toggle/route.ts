import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/lib/events';
import { pluginManifestRegistry } from '@/plugins/manifest-registry';
import { dispatchPluginEvent } from '@/plugins/server-runtime';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const projectId = typeof body?.projectId === 'string' ? body.projectId.trim() : '';
  const pluginId = typeof body?.pluginId === 'string' ? body.pluginId.trim() : '';
  const isActive = body?.isActive;

  if (!projectId || !pluginId || typeof isActive !== 'boolean') {
    return NextResponse.json(
      { code: 'INVALID_PLUGIN_TOGGLE', error: 'Indica un proyecto, un plugin y un estado válidos.' },
      { status: 400 },
    );
  }

  const compatibilityIssue = pluginManifestRegistry.compatibilityIssue(pluginId);
  if (compatibilityIssue === 'not-registered') {
    return NextResponse.json(
      { code: 'PLUGIN_NOT_REGISTERED', error: 'El plugin solicitado no está registrado.' },
      { status: 404 },
    );
  }
  if (compatibilityIssue === 'incompatible') {
    return NextResponse.json(
      { code: 'PLUGIN_INCOMPATIBLE', error: 'El plugin solicitado no es compatible con esta versión.' },
      { status: 409 },
    );
  }

  const projectExists = await prisma.project.count({ where: { id: projectId } });
  if (!projectExists) {
    return NextResponse.json(
      { code: 'PROJECT_NOT_FOUND', error: 'El proyecto solicitado no existe.' },
      { status: 404 },
    );
  }

  const plugin = await prisma.projectPlugin.upsert({
    where: { projectId_pluginId: { projectId, pluginId } },
    update: { isActive },
    create: { projectId, pluginId, isActive }
  });

  dispatchPluginEvent(projectId, isActive ? 'plugin:activated' : 'plugin:deactivated', { plugin });
  eventEmitter.emit('update');
  return NextResponse.json(plugin);
}
