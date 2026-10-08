import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FacilityDirectoryPort } from '../auth/actor-directory.port';
import { Facility } from '../visitas/checks/facility.entity';

@Injectable()
class KernelFacilityDirectory extends FacilityDirectoryPort {
  constructor(
    @InjectRepository(Facility)
    private readonly facilities: Repository<Facility>,
  ) {
    super();
  }
  async list() {
    return this.facilities.find({
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
  }
}
@Module({
  imports: [TypeOrmModule.forFeature([Facility])],
  providers: [
    { provide: FacilityDirectoryPort, useClass: KernelFacilityDirectory },
  ],
  exports: [FacilityDirectoryPort],
})
export class FacilityDirectoryModule {}
