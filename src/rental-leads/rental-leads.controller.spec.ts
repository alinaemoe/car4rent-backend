import { Test, TestingModule } from '@nestjs/testing';
import { RentalLeadsController } from './rental-leads.controller';
import { RentalLeadsService } from './rental-leads.service';

describe('RentalLeadsController', () => {
  let controller: RentalLeadsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RentalLeadsController],
      providers: [RentalLeadsService],
    }).compile();

    controller = module.get<RentalLeadsController>(RentalLeadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
