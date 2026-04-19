import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GeoService } from './geo.service';

@ApiTags('Geo')
@ApiBearerAuth()
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('reverse')
  @ApiOperation({ summary: 'Reverse geocode GPS coordinates to address' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  reverseGeocode(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ) {
    return this.geoService.reverseGeocode(lat, lng);
  }

  @Get('distance')
  @ApiOperation({ summary: 'Calculate distance between two GPS points' })
  @ApiQuery({ name: 'lat1', type: Number })
  @ApiQuery({ name: 'lon1', type: Number })
  @ApiQuery({ name: 'lat2', type: Number })
  @ApiQuery({ name: 'lon2', type: Number })
  calculateDistance(
    @Query('lat1') lat1: number,
    @Query('lon1') lon1: number,
    @Query('lat2') lat2: number,
    @Query('lon2') lon2: number,
  ) {
    return this.geoService.calculateDistance(lat1, lon1, lat2, lon2);
  }
}