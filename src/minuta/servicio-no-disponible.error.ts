// Un servicio del que depende la minuta no respondió o respondió con error
export class ServicioNoDisponibleError extends Error {
  constructor(public readonly servicio: string) {
    super(`Servicio no disponible: ${servicio}`);
  }
}
