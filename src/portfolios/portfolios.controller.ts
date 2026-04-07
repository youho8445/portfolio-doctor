import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { AddPortfolioItemDto } from './dto/add-portfolio-item.dto';

@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Post()
  create(@Body() dto: CreatePortfolioDto) {
    return this.portfoliosService.create(dto);
  }

  @Get()
  findAll() {
    return this.portfoliosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.portfoliosService.findOne(id);
  }

  @Post(':id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddPortfolioItemDto,
  ) {
    return this.portfoliosService.addItem(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.portfoliosService.delete(id);
  }

  @Get(':id/items')
  findItems(@Param('id', ParseIntPipe) id: number) {
    return this.portfoliosService.findItems(id);
  }
}
