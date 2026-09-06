import Link from 'next/link';

export default function TaskNotFound() {
  return <main className="empty-search"><h1>No encontramos esta tarjeta</h1><p>Comprueba el código. Es posible que la tarjeta haya sido eliminada.</p><Link className="task-back-link" href="/">Volver a proyectos</Link></main>;
}
