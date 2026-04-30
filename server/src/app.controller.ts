import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AppService } from './app.service';
import type { CreateLeadInput, Lead } from './lead.types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('leads')
  getLeads() {
    return this.appService.getLeads();
  }

  @Post('leads')
  createLead(
    @Body()
    body: CreateLeadInput,
  ) {
    return this.appService.createLead(body);
  }

  @Get('leads/:id')
  getLead(@Param('id') id: string) {
    return this.appService.getLead(id);
  }

  @Patch('leads/:id')
  updateLead(@Param('id') id: string, @Body() body: Partial<Lead>) {
    return this.appService.updateLead(id, body);
  }

  @Post('leads/:id/analyze')
  analyzeLead(@Param('id') id: string) {
    return this.appService.analyzeLead(id);
  }

  @Post('runs/daily')
  triggerDailyRun() {
    return this.appService.triggerDailyRun();
  }

  @Get('runs')
  getRuns() {
    return this.appService.getRuns();
  }
}
