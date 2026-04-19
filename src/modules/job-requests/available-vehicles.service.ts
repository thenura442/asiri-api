import { Injectable } from '@nestjs/common';
import { AssignmentService } from './assignment.service';

@Injectable()
export class AvailableVehiclesService {
  constructor(private assignmentService: AssignmentService) {}

  async getForJob(
    branchId: string,
    patientLat: number,
    patientLon: number,
  ) {
    return this.assignmentService.getAvailableVehiclesForJob(
      branchId,
      patientLat,
      patientLon,
    );
  }
}