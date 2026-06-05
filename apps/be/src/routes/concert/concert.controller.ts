import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConcertService } from './concert.service';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';
import { QueryConcertDto } from './dto/query-concert.dto';
import { CancelConcertDto } from './dto/cancel-concert.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { PermissionGuard } from '../auth/guard/permission.guard';
import { ScopeGuard } from '../auth/guard/scope.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ResourceScope } from '../auth/decorators/resource-scope.decorator';

@Controller('concerts')
export class ConcertController {
  constructor(private readonly concertService: ConcertService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('concert:create')
  create(
    @Body() createConcertDto: CreateConcertDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.concertService.create(createConcertDto, user?.id);
  }

  @Get()
  findAll(@Query() query: QueryConcertDto) {
    return this.concertService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.concertService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard, ScopeGuard)
  @RequirePermissions('concert:update')
  @ResourceScope({ type: 'concert', param: 'id' })
  update(@Param('id') id: string, @Body() updateConcertDto: UpdateConcertDto) {
    return this.concertService.update(id, updateConcertDto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, PermissionGuard, ScopeGuard)
  @RequirePermissions('concert:publish')
  @ResourceScope({ type: 'concert', param: 'id' })
  publish(@Param('id') id: string) {
    return this.concertService.publish(id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, PermissionGuard, ScopeGuard)
  @RequirePermissions('concert:cancel')
  @ResourceScope({ type: 'concert', param: 'id' })
  cancel(
    @Param('id') id: string,
    @Body() cancelConcertDto: CancelConcertDto = new CancelConcertDto(),
  ) {
    return this.concertService.cancel(id, cancelConcertDto);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, PermissionGuard, ScopeGuard)
  @RequirePermissions('concert:complete')
  @ResourceScope({ type: 'concert', param: 'id' })
  complete(@Param('id') id: string) {
    return this.concertService.complete(id);
  }
}
