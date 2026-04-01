-- AlterTable: adiciona status numérico da conta de anúncio (1=ativo, 2=desativado, etc.)
ALTER TABLE "AdAccount" ADD COLUMN "accountStatus" INTEGER;

-- AlterTable: flag para indicar token OAuth inválido (error 190)
ALTER TABLE "FacebookConnection" ADD COLUMN "tokenInvalid" BOOLEAN NOT NULL DEFAULT false;
