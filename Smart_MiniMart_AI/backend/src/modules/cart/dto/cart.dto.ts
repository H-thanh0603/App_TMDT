import { IsInt, IsString, Max, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId: string;

  // Max(999): chặn payload số lượng khổng lồ (dù còn bị chặn bởi tồn kho)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
