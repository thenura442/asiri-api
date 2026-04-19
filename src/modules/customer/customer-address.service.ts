import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SaveAddressDto } from './dto/save-address.dto';

@Injectable()
export class CustomerAddressService {
  constructor(private prisma: PrismaService) {}

  async getAddresses(patientId: string) {
    return this.prisma.customerAddress.findMany({
      where: { patientId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async saveAddress(patientId: string, dto: SaveAddressDto) {
    // Max 5 saved addresses
    const count = await this.prisma.customerAddress.count({
      where: { patientId },
    });
    if (count >= 5) {
      throw new BadRequestException(
        'Maximum of 5 saved addresses allowed',
      );
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { patientId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.create({
      data: { ...dto, patientId },
    });
  }

  async updateAddress(id: string, patientId: string, dto: Partial<SaveAddressDto>) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id, patientId },
    });
    if (!address) throw new NotFoundException('Address not found');

    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { patientId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.update({
      where: { id },
      data: dto,
    });
  }

  async deleteAddress(id: string, patientId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id, patientId },
    });
    if (!address) throw new NotFoundException('Address not found');

    await this.prisma.customerAddress.delete({ where: { id } });
    return { message: 'Address deleted successfully' };
  }
}