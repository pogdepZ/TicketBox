import { IsIn, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  orderId!: string;

  @IsIn(['VNPAY', 'MOMO'])
  provider!: 'VNPAY' | 'MOMO';

  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
