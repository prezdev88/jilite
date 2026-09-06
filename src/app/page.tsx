import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const projects = await prisma.project.findMany();

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Jilite</h1>
        <form action={async () => {
          'use server';
          const { prisma } = await import('@/lib/prisma');
          await prisma.project.create({
            data: {
              name: 'Nuevo Proyecto',
              columns: {
                create: [
                  { name: 'Por hacer', order: 0 },
                  { name: 'En curso', order: 1 },
                  { name: 'Terminado', order: 2 }
                ]
              }
            }
          });
          const { revalidatePath } = await import('next/cache');
          revalidatePath('/');
        }}>
          <Button type="submit">Nuevo Proyecto Rápido</Button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map(p => (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="hover:border-primary cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.description || "Sin descripción"}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="text-muted-foreground">No hay proyectos. Crea uno para empezar.</p>
        )}
      </div>
    </main>
  );
}
