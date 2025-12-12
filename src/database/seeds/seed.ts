import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { Machine } from '../../entities/machine.entity';
import { Role } from '../../common/enums/role.enum';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || 'YourPassword123',
  database: process.env.DB_DATABASE || 'maintenance_system',
  entities: [User, Machine],
  synchronize: true,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    const userRepository = AppDataSource.getRepository(User);
    const machineRepository = AppDataSource.getRepository(Machine);

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { username: 'admin' },
    });

    if (!existingAdmin) {
      // Create Admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      const admin = userRepository.create({
        username: 'admin',
        password: adminPassword,
        fullName: 'System Administrator',
        role: Role.ADMIN,
      });
      await userRepository.save(admin);
      console.log('Admin user created: admin / admin123');

      // Create Technician user
      const techPassword = await bcrypt.hash('tech123', 10);
      const technician = userRepository.create({
        username: 'technician',
        password: techPassword,
        fullName: 'John Technician',
        role: Role.TECHNICIAN,
      });
      await userRepository.save(technician);
      console.log('Technician user created: technician / tech123');

      // Create Regular user
      const userPassword = await bcrypt.hash('user123', 10);
      const user = userRepository.create({
        username: 'user',
        password: userPassword,
        fullName: 'Jane User',
        role: Role.USER,
      });
      await userRepository.save(user);
      console.log('Regular user created: user / user123');
    } else {
      console.log('Admin user already exists, skipping user creation');
    }

    // Check if machines already exist
    const existingMachine = await machineRepository.findOne({
      where: { code: 'CNC-001' },
    });

    if (!existingMachine) {
      // Create sample machines
      const machines = [
        {
          code: 'CNC-001',
          name: 'CNC Machine 1',
          description: 'High precision CNC machine for metal cutting',
          location: 'Building A, Floor 1',
        },
        {
          code: 'CNC-002',
          name: 'CNC Machine 2',
          description: 'CNC machine for plastic molding',
          location: 'Building A, Floor 1',
        },
        {
          code: 'LATHE-001',
          name: 'Lathe Machine 1',
          description: 'Heavy duty lathe for large components',
          location: 'Building B, Floor 2',
        },
        {
          code: 'DRILL-001',
          name: 'Drilling Machine 1',
          description: 'Industrial drilling machine',
          location: 'Building B, Floor 1',
        },
        {
          code: 'WELD-001',
          name: 'Welding Station 1',
          description: 'Automated welding station',
          location: 'Building C, Floor 1',
        },
      ];

      for (const machineData of machines) {
        const machine = machineRepository.create(machineData);
        await machineRepository.save(machine);
        console.log(`Machine created: ${machineData.code}`);
      }
    } else {
      console.log('Machines already exist, skipping machine creation');
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\nDefault credentials:');
    console.log('  Admin: admin / admin123');
    console.log('  Technician: technician / tech123');
    console.log('  User: user / user123');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
