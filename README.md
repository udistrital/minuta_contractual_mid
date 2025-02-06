# Minuta Contractual MID

API MID para generación de Minuta

## Especificaciones Técnicas

### Tecnologías Implementadas y Versiones
* NodeJS 16.13.0
* NestJS 10.4.9
* [Docker](https://docs.docker.com/engine/install/)
* [Docker Compose](https://docs.docker.com/compose/)

### Variables de Entorno
```shell
GESTION_CONTRACTUAL_CRUD
GESTION_CONTRACTUAL_MID
CLAUSULAS_PARAGRAFOS_CRUD
PLANTILLAS_MID
PROVEEDORES_MID
ORDENADORES_SUPERVISORES_CONTRATACION_MID
POLIZAS_MID
PORT: [Puerto de ejecución API]
```
Nota: En caso de no asignar el puerto en las variables de entorno, se asignará el puerto por defecto.

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
