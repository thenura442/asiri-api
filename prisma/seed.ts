import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create the main Asiri Central Lab branch
  const mainLab = await prisma.branch.upsert({
    where: { branchCode: 'BR-CENTRAL-01' },
    update: {},
    create: {
      name: 'Asiri Central Laboratory',
      type: 'lab',
      address: '181, Kirula Road, Colombo 05',
      latitude: 6.8962,
      longitude: 79.8665,
      branchCode: 'BR-CENTRAL-01',
      phone: '+94 11 452 3300',
      email: 'central@asiri-labs.lk',
      serviceRadiusKm: 10,
      isOnline: true,
      province: 'Western',
      district: 'Colombo',
    },
  });

  // Set default_lab_id = own id for lab-type branches
  await prisma.branch.update({
    where: { id: mainLab.id },
    data: { defaultLabId: mainLab.id },
  });

  console.log(`✅ Branch created: ${mainLab.name}`);

  // 2. Create default Super Admin user
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@asiri-labs.lk' },
    update: {},
    create: {
      email: 'superadmin@asiri-labs.lk',
      passwordHash: 'managed-by-supabase-auth',
      fullName: 'System Administrator',
      role: 'super_admin',
      branchId: mainLab.id,
      status: 'active',
      twoFactorEnabled: false,
    },
  });

  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // 3. Default system settings
  const defaultSettings = [
    { key: 'service_radius_km', value: '10' },
    { key: 'per_km_rate', value: '150' },
    { key: 'auto_dispatch_buffer_min', value: '15' },
    { key: 'late_cancellation_fee', value: '500' },
    { key: 'operating_hours_start', value: '06:30' },
    { key: 'operating_hours_end', value: '16:00' },
    { key: 'session_timeout_hours', value: '24' },
    { key: 'enforce_2fa', value: 'false' },
    { key: 'pickme_surcharge', value: '200' },
    { key: 'assignment_timeout_seconds', value: '120' },
    { key: 'report_reminder_days', value: '1,3,7' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: { ...setting, updatedBy: superAdmin.id },
    });
  }

  console.log(`✅ ${defaultSettings.length} settings created`);

  // 4. Sample tests
  const sampleTests = [
    { name: 'Full Blood Count', code: 'FBC-001', price: 1200, sampleType: 'blood' as const, turnaroundTime: '4-6 hrs' },
    { name: 'Lipid Profile', code: 'LIP-001', price: 2500, sampleType: 'blood' as const, turnaroundTime: '6-8 hrs' },
    { name: 'Blood Glucose (Fasting)', code: 'GLU-001', price: 800, sampleType: 'blood' as const, turnaroundTime: '2-4 hrs' },
    { name: 'Thyroid Profile (T3/T4/TSH)', code: 'THY-001', price: 3200, sampleType: 'blood' as const, turnaroundTime: '8-12 hrs' },
    { name: 'Urine Full Report', code: 'UFR-001', price: 600, sampleType: 'urine' as const, turnaroundTime: '2-3 hrs' },
    { name: 'HbA1c', code: 'HBA-001', price: 1800, sampleType: 'blood' as const, turnaroundTime: '6-8 hrs' },
  ];

  for (const test of sampleTests) {
    await prisma.test.upsert({
      where: { code: test.code },
      update: {},
      create: test,
    });
  }

  console.log(`✅ ${sampleTests.length} tests created`);
  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });