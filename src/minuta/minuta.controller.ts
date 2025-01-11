import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MinutaService } from './minuta.service';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { UpdateMinutaDto } from './dto/update-minuta.dto';

@Controller('minuta')
export class MinutaController {
  constructor(private readonly minutaService: MinutaService) {}

  @Post()
  create(@Body() createMinutaDto: CreateMinutaDto) {
    return this.minutaService.create(createMinutaDto);
  }

  @Get()
  findAll() {
    return this.minutaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.minutaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMinutaDto: UpdateMinutaDto) {
    return this.minutaService.update(+id, updateMinutaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.minutaService.remove(+id);
  }
}
