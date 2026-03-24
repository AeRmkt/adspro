import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  // Usuário de demonstração (crie via Supabase Auth primeiro)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@adspro.com.br' },
    update: {},
    create: {
      supabaseId: 'demo-supabase-id-substitua-pelo-real',
      email: 'demo@adspro.com.br',
      name: 'Usuário Demo',
      plan: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  })

  console.log('Usuário demo criado:', demoUser.email)
  console.log('Seed concluído!')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
