import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingsRepo: Repository<Setting>,
  ) {}

  async create(createSettingDto: CreateSettingDto) {
    const setting = this.settingsRepo.create(createSettingDto);
    return await this.settingsRepo.save(setting);
  }

  async findAll() {
    return await this.settingsRepo.find();
  }

  async findOne(key: string) {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting ${key} not found`);
    return setting;
  }

  async update(key: string, updateSettingDto: UpdateSettingDto) {
    const setting = await this.findOne(key);
    Object.assign(setting, updateSettingDto);
    return await this.settingsRepo.save(setting);
  }

  async remove(key: string) {
    const setting = await this.findOne(key);
    return await this.settingsRepo.remove(setting);
  }
}
