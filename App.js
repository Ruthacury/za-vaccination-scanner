import React, { useState, useEffect } from 'react';
import { Text, ScrollView, View, StyleSheet, Button, StatusBar, Dimensions, BackHandler } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Buffer } from 'buffer';
import moment from 'moment-timezone';

function padding(a, b, c, d) {
  return {
    paddingTop: a,
    paddingRight: b !== undefined ? b : a,
    paddingBottom: c !== undefined ? c : a,
    paddingLeft: d !== undefined ? d : (b !== undefined ? b : a)
  }
}

function isJSON(str) {
  try {
      return (JSON.parse(str) && !!str);
  } catch (e) {
      return false;
  }
}

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [data, setData] = useState(null);
  const [hcert, setHCert] = useState(null);
  const [issueDate, setIssueDate] = useState(null);
  const [expireDate, setExpireDate] = useState(null);
  const [valid, setValid] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();


    const backAction = () => {
      setScanned(false);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  const handleBarCodeScanned = (event) => {
    setScanned(true);

    var d = null;
    try {
      d = JSON.parse(event.data);

      d.iat; d.exp; d.hcert;
    } catch (error) {
      setValid(false);
      setHCert(null);
      setErrorMessage(`INVALID CERTIFICATE`);
      
      return;
    }

    moment.tz.setDefault("Africa/Johannesburg");
    
    var issueDate = moment(d.iat);
    var exp = moment.duration(`P${d.exp}`);
    var expirationDate = issueDate.clone().add(exp.asSeconds(), 'second');

    setIssueDate(issueDate);
    setExpireDate(expirationDate);

    setData(d);
    setHCert(JSON.parse(Buffer.from(d.hcert, 'base64').toString()));

    if (moment().isAfter(expirationDate)) {
      setValid(false);
      setErrorMessage(`EXPIRED: Vaccination certificate expired on ${expirationDate.toString()}.`);
      return;
    }

    setValid(true);
  };

  if (hasPermission === null) {
    return <Text style={{...styles.errorContainer, ...styles.centreText}}>Accessing camera...</Text>;
  }
  if (hasPermission === false) {
    return <View style={{...styles.errorContainer, paddingTop: StatusBar.currentHeight}}>
      <Text style={{...styles.centreText, ...padding(0, 0, 8, 0), color: 'white'}}>This app cannot function without access to the camera!</Text>
      <Button title={'Grant Access to Camera'} onPress={async () => {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      }} />
    </View>;
  }

  var immunisations = [];
  var i = 0;
  if (hcert && hcert.immunizationEvents) {
    hcert.immunizationEvents.forEach(immunisation => {
      immunisations.push(<Text key={i++} style={{...padding(8, 0), color: 'white'}}>
        Vaccine Received:  {immunisation.vaccineReceived}{"\n"}
        Vaccine Date:  {immunisation.vaccineDate}{"\n"}
        Proof of Vaccination Code:  {immunisation.proofOfVaccineCode}
      </Text>);
    });
  }

  return (
    <View style={{...styles.container, paddingTop: StatusBar.currentHeight}}>
      {!scanned && <View style={styles.container}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      </View>}
      {scanned && <ScrollView style={styles.container}>
        <Text style={{...styles.validation, backgroundColor: valid ? 'green' : 'darkred'}}>{valid ? 'CERTIFICATE VALID' : errorMessage}</Text>
        {
          hcert && <View style={styles.certContainer}>
            <Text style={{fontSize: 20, fontWeight: 'bold', ...padding(4), color: 'white'}}>Certificate Details</Text>
            <Text style={{color: 'white'}}>ID Document Used:  {hcert.idType}</Text>
            <Text style={{color: 'white'}}>ID Number:  {hcert.idValue}</Text>
            <Text style={{color: 'white'}}>Firstname:  {hcert.firstName}</Text>
            <Text style={{color: 'white'}}>Surname:  {hcert.surname}</Text>
            <Text style={{color: 'white'}}>Date of Birth:  {hcert.dateOfBirth}</Text>
            <View style={{...padding(8, 0), color: 'white'}}>{immunisations}</View>
            <Text style={{color: 'white'}}>Date Issued:  {issueDate.toString()}</Text>
            <Text style={{color: 'white'}}>Expiry Date:  {expireDate.toString()}</Text>
          </View>
        }
        <View style={{...padding(4, 16)}}>
          <Button title={'Scan Another Certificate'} onPress={() => setScanned(false)} />
        </View>
      </ScrollView>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
    backgroundColor: '#222222',
  },
  certContainer: {
    ...padding(4, 16, 8, 16),
  },
  validation: {
    ...padding(16),
    marginBottom: 8,
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    ...padding(32),
    display: 'flex',
    justifyContent: 'center',
    // backgroundColor: 'lightgray',
    alignItems: 'center',
    backgroundColor: '#222222',
    color: 'white',
  },
  centreText: {
    textAlign: 'center',
    textAlignVertical: 'center',
  },
}); 
