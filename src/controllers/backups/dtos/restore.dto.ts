import { IsOptional, IsString, Length } from "class-validator";

export class BackupControllerRestoreDto {
    @IsString()
    @Length(0,255)
    @IsOptional()
    channel_id: string;
}