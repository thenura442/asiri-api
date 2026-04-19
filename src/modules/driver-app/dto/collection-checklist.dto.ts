import { IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CollectionFailReason } from '../../../common/enums/collection-fail-reason.enum';

export class TestCollectionItemDto {
  @ApiProperty()
  @IsUUID()
  jobRequestTestId!: string;

  @ApiProperty({ enum: ['collected', 'failed'] })
  @IsEnum(['collected', 'failed'])
  status!: 'collected' | 'failed';

  @ApiProperty({ enum: CollectionFailReason })
  @IsOptional()
  @IsEnum(CollectionFailReason)
  failReason?: CollectionFailReason;

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CollectionChecklistDto {
  @ApiProperty({ type: [TestCollectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCollectionItemDto)
  items!: TestCollectionItemDto[];
}