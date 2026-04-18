import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { AddPortfolioItemDto } from './dto/add-portfolio-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Post()
  create(@Body() dto: CreatePortfolioDto, @Req() req: { user: { id: number } }) {
    return this.portfoliosService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Req() req: { user: { id: number } }) {
    return this.portfoliosService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { id: number } }) {
    return this.portfoliosService.findOne(id, req.user.id);
  }

  @Post(':id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddPortfolioItemDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.portfoliosService.addItem(id, dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string },
    @Req() req: { user: { id: number } },
  ) {
    return this.portfoliosService.update(id, body.name, req.user.id);
  }

  @Delete(':id/items')
  clearItems(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { id: number } }) {
    return this.portfoliosService.clearItems(id, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { id: number } }) {
    return this.portfoliosService.delete(id, req.user.id);
  }

  @Get(':id/items')
  findItems(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { id: number } }) {
    return this.portfoliosService.findItems(id, req.user.id);
  }
}
