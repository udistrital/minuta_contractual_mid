import { PartialType } from '@nestjs/swagger';
import { CreateMinutaDto } from './create-minuta.dto';

export class UpdateMinutaDto extends PartialType(CreateMinutaDto) {}
