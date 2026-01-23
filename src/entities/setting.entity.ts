import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key: string; // 'support_phone', 'currency'

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ nullable: true })
  description: string; // "Телефон техподдержки"
}
