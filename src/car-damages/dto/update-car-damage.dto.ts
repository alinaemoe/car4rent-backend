import { PartialType } from '@nestjs/mapped-types';
import { CreateCarDamageDto } from './create-car-damage.dto';

export class UpdateCarDamageDto extends PartialType(CreateCarDamageDto) {}
