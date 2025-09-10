// client/src/App.js

import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import VotingContract from './contracts/Voting.json';
import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        // Connect to MetaMask
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          await window.ethereum.request({ method: 'eth_requestAccounts' });

          const accounts = await web3Instance.eth.getAccounts();
          setAccount(accounts[0]);

          const networkId = await web3Instance.eth.net.getId();
          const deployedNetwork = VotingContract.networks[networkId];
          if (!deployedNetwork) {
            setError("Smart contract not deployed to the detected network.");
            setLoading(false);
            return;
          }

          const contractInstance = new web3Instance.eth.Contract(
            VotingContract.abi,
            deployedNetwork.address
          );
          setContract(contractInstance);

          // Fetch candidates and voter status
          const candidateCount = await contractInstance.methods.candidatesCount().call();
          const fetchedCandidates = [];
          for (let i = 1; i <= candidateCount; i++) {
            const candidate = await contractInstance.methods.candidates(i).call();
            fetchedCandidates.push(candidate);
          }
          setCandidates(fetchedCandidates);

          const voterStatus = await contractInstance.methods.voters(accounts[0]).call();
          setHasVoted(voterStatus);
        } else {
          setError("MetaMask is not installed. Please install it to use this dApp.");
        }
        setLoading(false);
      } catch (error) {
        console.error("Initialization error:", error);
        setError("Failed to load web3, accounts, or contract. Check console for details.");
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleVote = async (candidateId) => {
    if (contract && account) {
      try {
        await contract.methods.vote(candidateId).send({ from: account });
        setHasVoted(true);
        // Refresh candidate vote counts
        const updatedCandidates = [...candidates];
        const votedCandidate = updatedCandidates.find(c => c.id === candidateId);
        if (votedCandidate) {
          // Note: In a real app, you might want to re-fetch from the chain
          votedCandidate.voteCount = (parseInt(votedCandidate.voteCount) + 1).toString();
        }
        setCandidates(updatedCandidates);

      } catch (error) {
        console.error("Error casting vote:", error);
        setError("An error occurred while casting your vote.");
      }
    }
  };

  if (loading) {
    return <div>Loading Web3, accounts, and contract...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="App">
      <h1>Voting dApp</h1>
      <p>Your Account: {account}</p>
      {hasVoted ? (
        <h2>You have already voted!</h2>
      ) : (
        <h2>Cast Your Vote</h2>
      )}
      <div className="candidate-list">
        {candidates.map(candidate => (
          <div key={candidate.id} className="candidate-card">
            <h3>{candidate.name}</h3>
            <p>Votes: {candidate.voteCount}</p>
            {!hasVoted && (
              <button onClick={() => handleVote(candidate.id)}>Vote</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;