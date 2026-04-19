import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { OsrmService } from '../../core/osrm/osrm.service';
import { haversineDistance } from '../../common/utils/haversine.util';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private prisma: PrismaService,
    private osrm: OsrmService,
  ) {}

  async findNearestBranch(
    patientLat: number,
    patientLon: number,
    radiusKm = 5,
  ): Promise<string | null> {
    // Get all online branches
    const branches = await this.prisma.branch.findMany({
      where: { isOnline: true },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
      },
    });

    // First pass — Haversine filter within radius
    const nearby = branches
      .map((branch) => ({
        ...branch,
        distanceKm: haversineDistance(
          patientLat,
          patientLon,
          Number(branch.latitude),
          Number(branch.longitude),
        ),
      }))
      .filter((b) => b.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3); // Top 3 candidates for OSRM

    if (nearby.length === 0) {
      // Expand to larger radius
      if (radiusKm < 10) {
        this.logger.log(`No branch within ${radiusKm}km — expanding to 10km`);
        return this.findNearestBranch(patientLat, patientLon, 10);
      }
      return null;
    }

    // Second pass — OSRM road distance for top 3
    const withRoadDistance = await Promise.all(
      nearby.map(async (branch) => {
        try {
          const route = await this.osrm.getRoute(
            patientLat,
            patientLon,
            Number(branch.latitude),
            Number(branch.longitude),
          );
          return { ...branch, roadDistanceKm: route.distanceKm };
        } catch {
          return { ...branch, roadDistanceKm: branch.distanceKm };
        }
      }),
    );

    // Return the nearest branch by road distance
    withRoadDistance.sort((a, b) => a.roadDistanceKm - b.roadDistanceKm);
    return withRoadDistance[0]?.id ?? null;
  }

  async getAvailableVehiclesForJob(
    branchId: string,
    patientLat: number,
    patientLon: number,
  ) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { branchId, status: 'available' },
      include: {
        currentDriver: {
          select: { id: true, fullName: true, phone: true },
        },
        branch: {
          select: { latitude: true, longitude: true },
        },
      },
    });

    // Add ETA for each vehicle
    const withEta = await Promise.all(
      vehicles.map(async (vehicle) => {
        try {
          const route = await this.osrm.getRoute(
            Number(vehicle.branch.latitude),
            Number(vehicle.branch.longitude),
            patientLat,
            patientLon,
          );
          return {
            ...vehicle,
            etaMinutes: Math.ceil(route.durationSec / 60),
            distanceKm: route.distanceKm,
          };
        } catch {
          return { ...vehicle, etaMinutes: null, distanceKm: null };
        }
      }),
    );

    return withEta.sort((a, b) => (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999));
  }
}