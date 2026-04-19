import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async calculatePrice(
    testIds: string[],
    distanceKm: number,
    isExternalTransport = false,
    externalTransportFare = 0,
  ): Promise<{
    basePrice: number;
    transportFee: number;
    totalPrice: number;
    perKmRate: number;
  }> {
    // Get current per_km_rate from settings
    const rateSetting = await this.prisma.setting.findUnique({
      where: { key: 'per_km_rate' },
    });
    const perKmRate = parseFloat(rateSetting?.value ?? '150');

    // Get pickme surcharge setting
    const surchargeSetting = await this.prisma.setting.findUnique({
      where: { key: 'pickme_surcharge' },
    });
    const pickmeSurcharge = parseFloat(surchargeSetting?.value ?? '200');

    // Sum base prices of all tests
    const tests = await this.prisma.test.findMany({
      where: { id: { in: testIds } },
      select: { price: true },
    });
    const basePrice = tests.reduce(
      (sum, t) => sum + Number(t.price),
      0,
    );

    // Calculate transport fee
    let transportFee = 0;
    if (isExternalTransport && externalTransportFare > 0) {
      // PickMe formula: (fare × 2) + surcharge
      transportFee = externalTransportFare * 2 + pickmeSurcharge;
    } else {
      transportFee = distanceKm * perKmRate;
    }

    const totalPrice = basePrice + transportFee;

    return {
      basePrice,
      transportFee,
      totalPrice,
      perKmRate,
    };
  }
}