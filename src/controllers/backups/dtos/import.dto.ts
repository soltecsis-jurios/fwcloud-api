import { Validate } from "class-validator";
import { FileInfo } from "../../../fonaments/http/files/file-info";
import { HasExtension } from "../../../fonaments/validation/rules/extension.validation";
import { IsFile } from "../../../fonaments/validation/rules/file.validation";

export class BackupControllerImportDto {
    @Validate(IsFile)
    @Validate(HasExtension, ['fwcloud'])
    file: FileInfo;
}