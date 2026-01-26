import { Test, TestingModule } from '@nestjs/testing';
import { PartnershipRequestsService } from './partnership-requests.service';

describe('PartnershipRequestsService', () => {
  let service: PartnershipRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartnershipRequestsService],
    }).compile();

    service = module.get<PartnershipRequestsService>(PartnershipRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
