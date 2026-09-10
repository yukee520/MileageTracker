  const generateExcelReport = async () => {
    try {
      setIsExporting(true);
      const allTrips = trips;

      if (allTrips.length === 0) {
        Alert.alert('No Data', 'No trips found to export.');
        setIsExporting(false);
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = driverName || 'Mileage Tracker';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Trip Logs');
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Time', key: 'time', width: 20 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Purpose', key: 'purpose', width: 25 },
        { header: 'Place Name', key: 'placeName', width: 25 },
        { header: 'From', key: 'from', width: 30 },
        { header: 'To', key: 'to', width: 30 },
        { header: 'Distance (km)', key: 'distance', width: 15 },
        { header: 'Driver', key: 'driver', width: 20 }
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007AFF' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 25;

      allTrips.forEach((trip, index) => {
        const row = sheet.addRow({
          date: trip.date || '',
          time: trip.time || '',
          category: trip.purposeCategory || '',
          purpose: trip.purpose || '',
          placeName: trip.placeName || '',
          from: trip.from || '',
          to: trip.to || '',
          distance: trip.distance || 0,
          driver: trip.userName || ''
        });
        row.height = 20;
        if (index % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
          });
        }
      });

      const totalDistance = allTrips.reduce((sum, t) => sum + (t.distance || 0), 0);
      const summaryRow = sheet.addRow({
        date: '',
        time: '',
        category: '',
        purpose: 'TOTAL',
        placeName: '',
        from: '',
        to: '',
        distance: totalDistance.toFixed(1),
        driver: ''
      });
      summaryRow.font = { bold: true };
      summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
      summaryRow.height = 25;

      if (currentConfig.group && teamMembers.length > 0) {
        const teamSheet = workbook.addWorksheet('Team Summary');
        teamSheet.columns = [
          { header: 'Member', key: 'name', width: 25 },
          { header: 'Trips', key: 'trips', width: 15 },
          { header: 'Distance (km)', key: 'distance', width: 20 }
        ];

        const teamHeader = teamSheet.getRow(1);
        teamHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        teamHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };
        teamHeader.alignment = { horizontal: 'center', vertical: 'middle' };
        teamHeader.height = 25;

        teamMembers.forEach((member) => {
          const stats = getMemberStats(member.name);
          teamSheet.addRow({
            name: member.name,
            trips: stats.totalTrips,
            distance: stats.totalDistance
          });
        });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `mileage_report_${timestamp}.xlsx`;

      let baseDir = null;
      try {
        if (FileSystem.documentDirectory) baseDir = FileSystem.documentDirectory;
      } catch (e) {}
      if (!baseDir) {
        try {
          if (FileSystem.cacheDirectory) baseDir = FileSystem.cacheDirectory;
        } catch (e) {}
      }
      if (!baseDir) {
        try {
          const savedDir = await AsyncStorage.getItem('@excel_export_dir');
          if (savedDir) baseDir = savedDir;
        } catch (e) {}
      }
      if (!baseDir) {
        baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '/data/data/com.yourcompany.mileagetracker/cache/';
      }
      if (!baseDir.endsWith('/') && !baseDir.endsWith('\\')) {
        baseDir = baseDir + '/';
      }
      try {
        await AsyncStorage.setItem('@excel_export_dir', baseDir);
      } catch (e) {}

      const filePath = `${baseDir}${fileName}`;
      console.log('Saving Excel to:', filePath);

      const buffer = await workbook.xlsx.writeBuffer();
      const base64String = arrayBufferToBase64(buffer);

      const encodingType = FileSystem.EncodingType ? FileSystem.EncodingType.Base64 : 'base64';
      await FileSystem.writeAsStringAsync(filePath, base64String, {
        encoding: encodingType,
      });

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error('File was not created successfully');
      }

      console.log('File saved successfully, size:', fileInfo.size);

      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Export Trip Report',
            UTI: 'com.microsoft.excel.xlsx',
          });
        } else {
          await Share.share({
            title: 'Mileage Report',
            url: filePath,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
        }
      } catch (shareError) {
        console.log('Share error, but file was saved:', shareError);
        Alert.alert('File Saved', `Report saved to: ${filePath}`);
      }

      Alert.alert('Success', 'Excel report generated successfully!');
    } catch (error) {
      console.error('Error generating Excel report:', error);
      Alert.alert('Error', 'Failed to generate Excel report: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };
