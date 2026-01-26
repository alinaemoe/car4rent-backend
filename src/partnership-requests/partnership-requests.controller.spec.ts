import { Test, TestingModule } from '@nestjs/testing';
import { PartnershipRequestsController } from './partnership-requests.controller';
import { PartnershipRequestsService } from './partnership-requests.service';

describe('PartnershipRequestsController', () => {
  let controller: PartnershipRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnershipRequestsController],
      providers: [PartnershipRequestsService],
    }).compile();

    controller = module.get<PartnershipRequestsController>(PartnershipRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
