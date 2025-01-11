import { Injectable } from '@nestjs/common';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { UpdateMinutaDto } from './dto/update-minuta.dto';

@Injectable()
export class MinutaService {
  create(createMinutaDto: CreateMinutaDto) {
    return 'This action adds a new minuta';
  }

  findAll() {
    return `This action returns all minuta`;
  }

  findOne(id: number) {
    return `This action returns a #${id} minuta`;
  }

  update(id: number, updateMinutaDto: UpdateMinutaDto) {
    return `This action updates a #${id} minuta`;
  }

  remove(id: number) {
    return `This action removes a #${id} minuta`;
  }
}
