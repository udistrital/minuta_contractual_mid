# Minuta Contractual MID

API MID para generación de Minuta

## Especificaciones Técnicas

### Tecnologías Implementadas y Versiones
* NodeJS 24.x
* NestJS 11.x
* [Docker](https://docs.docker.com/engine/install/)
* [Docker Compose](https://docs.docker.com/compose/)

### Variables de Entorno
```shell
GESTION_CONTRACTUAL_CRUD
GESTION_CONTRACTUAL_MID
CLAUSULAS_PARAGRAFOS_CRUD
PLANTILLAS_MID
PARAMETROS_CRUD
PROVEEDORES_MID
ORDENADORES_SUPERVISORES_CONTRATACION_MID
PORT: [Puerto de ejecución API]
```
Nota: En caso de no asignar el puerto en las variables de entorno, se asignará el puerto por defecto.
Nota: Las URLs de los servicios deben terminar en `/`.

### Acta de aprobación de póliza

Genera el acta de aprobación de póliza en PDF (base64) a partir de la plantilla oficial PAAP.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/acta-poliza/contratos/:id` | Acta con la póliza y los amparos ya registrados para el contrato. |
| POST | `/acta-poliza/contratos/:id/borrador` | Borrador con los amparos tal como están en pantalla (aún sin registrar). Body: `{ "amparos": [{ "id", "valor", "fecha_inicio", "fecha_fin" }] }`. |

Respuestas: `200` PDF generado, `400` póliza inconsistente (sin número, aseguradora, vigencia, expedición, amparos, o con vigencias inválidas), `404` contrato, póliza, contratista o plantilla no encontrados, `502` un servicio del que depende no respondió.

Servicios que consume: `GESTION_CONTRACTUAL_CRUD` (contrato y contratista), `GESTION_CONTRACTUAL_MID` (póliza y amparos), `PROVEEDORES_MID` (datos del contratista), `PARAMETROS_CRUD` (unidad del plazo de ejecución) y `PLANTILLAS_MID` (renderizado de la plantilla a HTML y luego a PDF).

El mid solo devuelve el PDF. La subida al gestor documental y el registro en `documentos-contratos` los hace el micro-frontend `gestion_contractual_mf`.

Pendientes conocidos: el catálogo de aseguradoras está fijo en el código (`TODO(#360)`) y la plantilla real en `plantillas_crud` trae una variable vacía (`{{ }}`) en "PLAZO DE EJECUCIÓN", por lo que en local se usa un mock de `plantillas_crud`.

### Ejecución del Proyecto
```shell
#1. Instalación del Gestor de Paquetes
corepack enable pnpm

#2. Instalación de Dependencias
pnpm install

# 3. Crear el archivo .env y asignar las variables de entorno
touch .env

# 4. Ejectuar el proyecto
pnpm start:dev (Modo Desarrollo)
```
Nota: Para otras plataformas de PNPM consultar la [documentación oficial](https://pnpm.io/installation)

### Swagger
```shell
http://localhost:3000/api
```

### Ejecución Dockerfile
```shell
# TODO
```

### Ejecución docker-compose
```shell
# TODO
```

### Ejecución Pruebas

Pruebas unitarias
```shell
# Test
pnpm test

# Se ejecutará jest, validando los casos de prueba en los archivos .spec.ts

```

## Estado CI

```shell
EN PROCESO
```

## Licencia

This file is part of minuta_contractual_mid.

minuta_contractual_mid is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

minuta_contractual_mid is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with sga_mid. If not, see https://www.gnu.org/licenses/.
