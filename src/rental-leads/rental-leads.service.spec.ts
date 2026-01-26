import { Test, TestingModule } from '@nestjs/testing';
import { RentalLeadsService } from './rental-leads.service';

describe('RentalLeadsService', () => {
  let service: RentalLeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RentalLeadsService],
    }).compile();

    service = module.get<RentalLeadsService>(RentalLeadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
